import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ArrowLeft, Camera, User, Phone, Mail, Users, Check, ImageIcon, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/lib/supabase";
import { Ministry } from "@/types";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getMinistryColor } from "@/constants/ministryColors";
import {
  pickImageFromCamera,
  pickImageFromGallery,
  showImagePickerOptions,
  PickedImage,
} from "@/lib/image-picker";


const AVATAR_OPTIONS = [
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop",
  "https://images.unsplash.com/photo-1544725176-7c40e5a71c5e?w=200&h=200&fit=crop",
];

export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, updateUser } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [selectedMinistries, setSelectedMinistries] = useState<string[]>(user?.ministries || []);
  const [pendingImage, setPendingImage] = useState<PickedImage | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const ministriesQuery = useQuery({
    queryKey: ['ministries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ministries')
        .select('*')
        .eq('status', 'active');
      if (error) throw error;
      return data || [];
    },
    enabled: false,
  });
  const availableMinistries: Ministry[] = ministriesQuery.data || [];

  useEffect(() => {
    if (user?.ministries) {
      setSelectedMinistries(user.ministries);
    }
  }, [user?.ministries]);

  const toggleMinistry = (ministryId: string) => {
    setSelectedMinistries((prev) =>
      prev.includes(ministryId)
        ? prev.filter((id) => id !== ministryId)
        : [...prev, ministryId]
    );
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { name: string; phone?: string; avatar?: string; ministries: string[] }) => {
      if (!user) throw new Error('Not authenticated');
      
      const { error } = await (supabase
        .from('users') as any)
        .update({
          full_name: data.name,
          phone: data.phone,
          avatar_url: data.avatar,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
      
      if (error) throw error;
      return data;
    },
    onSuccess: async (updatedData) => {
      console.log("Profile updated successfully:", updatedData.name);
      await updateUser({
        name: updatedData.name,
        phone: updatedData.phone,
        avatar: updatedData.avatar,
        ministries: updatedData.ministries,
      });
      
      if (Platform.OS === "web") {
        alert("Profile updated successfully!");
      } else {
        Alert.alert("Success", "Profile updated successfully!");
      }
      router.back();
    },
    onError: (error: Error) => {
      console.error("Error updating profile:", error);
      if (Platform.OS === "web") {
        alert(error.message || "Failed to update profile");
      } else {
        Alert.alert("Error", error.message || "Failed to update profile");
      }
    },
  });

  const handleSave = () => {
    if (!name.trim()) {
      if (Platform.OS === "web") {
        alert("Name is required");
      } else {
        Alert.alert("Error", "Name is required");
      }
      return;
    }

    console.log("Saving profile changes...");
    updateProfileMutation.mutate({
      name: name.trim(),
      phone: phone.trim() || undefined,
      avatar: avatar || undefined,
      ministries: selectedMinistries,
    });
  };

  const selectAvatar = (url: string) => {
    setAvatar(url);
    setPendingImage(null);
    setShowAvatarPicker(false);
  };

  const handleTakePhoto = async () => {
    console.log("Taking photo...");
    const result = await pickImageFromCamera();
    if (result.success && result.image) {
      console.log("Photo captured, showing preview");
      setPendingImage(result.image);
      setShowPreviewModal(true);
    } else if (result.error && result.error !== "Canceled") {
      if (Platform.OS === "web") {
        alert(result.error);
      } else {
        Alert.alert("Error", result.error);
      }
    }
  };

  const handleChooseFromLibrary = async () => {
    console.log("Opening gallery...");
    const result = await pickImageFromGallery();
    if (result.success && result.image) {
      console.log("Image selected, showing preview");
      setPendingImage(result.image);
      setShowPreviewModal(true);
    } else if (result.error && result.error !== "Canceled") {
      if (Platform.OS === "web") {
        alert(result.error);
      } else {
        Alert.alert("Error", result.error);
      }
    }
  };

  const handleImagePickerPress = () => {
    if (Platform.OS === "web") {
      handleChooseFromLibrary();
    } else {
      showImagePickerOptions(handleTakePhoto, handleChooseFromLibrary);
    }
  };

  const handleConfirmImage = async () => {
    if (!pendingImage || !user) return;

    console.log("Setting profile image...");
    setIsUploading(true);

    try {
      setAvatar(pendingImage.uri);
      setPendingImage(null);
      setShowPreviewModal(false);
      setShowAvatarPicker(false);

      if (Platform.OS === "web") {
        alert("Photo updated successfully!");
      } else {
        Alert.alert("Success", "Photo updated successfully!");
      }
    } catch (error) {
      console.error("Image error:", error);
      if (Platform.OS === "web") {
        alert("Failed to set image. Please try again.");
      } else {
        Alert.alert("Error", "Failed to set image. Please try again.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancelPreview = () => {
    setPendingImage(null);
    setShowPreviewModal(false);
  };

  if (!user) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <TouchableOpacity
          style={[
            styles.saveButton,
            updateProfileMutation.isPending && styles.saveButtonDisabled,
          ]}
          onPress={handleSave}
          disabled={updateProfileMutation.isPending}
          activeOpacity={0.7}
        >
          {updateProfileMutation.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={handleImagePickerPress}
              activeOpacity={0.8}
            >
              <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
              <View style={styles.cameraOverlay}>
                <Camera size={20} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.changePhotoText}>Tap to change photo</Text>
            
            <View style={styles.photoOptionsRow}>
              <TouchableOpacity
                style={styles.photoOptionButton}
                onPress={handleImagePickerPress}
                activeOpacity={0.7}
              >
                <Camera size={18} color={Colors.primary} />
                <Text style={styles.photoOptionText}>
                  {Platform.OS === "web" ? "Upload Photo" : "Take Photo"}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.photoOptionButton}
                onPress={() => setShowAvatarPicker(!showAvatarPicker)}
                activeOpacity={0.7}
              >
                <ImageIcon size={18} color={Colors.primary} />
                <Text style={styles.photoOptionText}>Choose Avatar</Text>
              </TouchableOpacity>
            </View>
          </View>

          {showAvatarPicker && (
            <View style={styles.avatarPicker}>
              <Text style={styles.pickerTitle}>Choose an avatar</Text>
              <View style={styles.avatarGrid}>
                {AVATAR_OPTIONS.map((url, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.avatarOption,
                      avatar === url && styles.avatarOptionSelected,
                    ]}
                    onPress={() => selectAvatar(url)}
                    activeOpacity={0.7}
                  >
                    <Image source={{ uri: url }} style={styles.avatarOptionImage} contentFit="cover" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.formSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputContainer}>
                <User size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter your full name"
                  placeholderTextColor={Colors.textTertiary}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputContainer, styles.inputDisabled]}>
                <Mail size={20} color={Colors.textTertiary} />
                <TextInput
                  style={[styles.input, styles.inputTextDisabled]}
                  value={user.email}
                  editable={false}
                  placeholder="Email address"
                  placeholderTextColor={Colors.textTertiary}
                />
              </View>
              <Text style={styles.helperText}>Email cannot be changed</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.inputContainer}>
                <Phone size={20} color={Colors.textSecondary} />
                <TextInput
                  style={styles.input}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter your phone number"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>

          <View style={styles.ministrySection}>
            <View style={styles.ministrySectionHeader}>
              <Users size={20} color={Colors.primary} />
              <Text style={styles.ministrySectionTitle}>Ministry Affiliations</Text>
            </View>
            <Text style={styles.ministrySectionSubtitle}>
              Select the ministries you are part of. These will appear as colored dots on your profile.
            </Text>
            
            {ministriesQuery.isLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 16 }} />
            ) : availableMinistries.length === 0 ? (
              <Text style={styles.noMinistriesText}>No ministries available</Text>
            ) : (
              <View style={styles.ministriesGrid}>
                {availableMinistries.map((ministry: Ministry) => {
                  const isSelected = selectedMinistries.includes(ministry.id);
                  const color = ministry.color || getMinistryColor(ministry.name, ministry.id);
                  return (
                    <TouchableOpacity
                      key={ministry.id}
                      style={[
                        styles.ministryChip,
                        isSelected && { backgroundColor: color + "20", borderColor: color },
                      ]}
                      onPress={() => toggleMinistry(ministry.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.ministryDot, { backgroundColor: color }]} />
                      <Text
                        style={[
                          styles.ministryChipText,
                          isSelected && { color: color, fontWeight: "600" as const },
                        ]}
                        numberOfLines={1}
                      >
                        {ministry.name}
                      </Text>
                      {isSelected && (
                        <View style={[styles.checkIcon, { backgroundColor: color }]}>
                          <Check size={10} color="#fff" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Profile Information</Text>
            <Text style={styles.infoText}>
              Your profile information helps others identify you in the community. 
              Your email is used for account security and notifications.
            </Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showPreviewModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelPreview}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.previewModal}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Preview Photo</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCancelPreview}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.previewImageContainer}>
              {pendingImage && (
                <Image
                  source={{ uri: pendingImage.uri }}
                  style={styles.previewImage}
                  contentFit="cover"
                />
              )}
            </View>

            <Text style={styles.previewHint}>
              This will be your new profile picture
            </Text>

            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancelPreview}
                activeOpacity={0.7}
                disabled={isUploading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  isUploading && styles.confirmButtonDisabled,
                ]}
                onPress={handleConfirmImage}
                activeOpacity={0.7}
                disabled={isUploading}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Check size={18} color="#fff" />
                    <Text style={styles.confirmButtonText}>Use Photo</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    backgroundColor: Colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.background,
  },
  title: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 60,
    alignItems: "center",
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600" as const,
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: Colors.surface,
  },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: Colors.surface,
  },
  changePhotoText: {
    fontSize: 14,
    color: Colors.primary,
    marginTop: 8,
    fontWeight: "500" as const,
  },
  photoOptionsRow: {
    flexDirection: "row" as const,
    gap: 12,
    marginTop: 16,
  },
  photoOptionButton: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    backgroundColor: Colors.primary + "15",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary + "30",
  },
  photoOptionText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "500" as const,
  },
  avatarPicker: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  pickerTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    marginBottom: 12,
  },
  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  avatarOption: {
    borderRadius: 30,
    borderWidth: 2,
    borderColor: "transparent",
  },
  avatarOptionSelected: {
    borderColor: Colors.primary,
  },
  avatarOptionImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  formSection: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.text,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  inputDisabled: {
    backgroundColor: Colors.background,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  inputTextDisabled: {
    color: Colors.textTertiary,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginLeft: 4,
  },
  infoCard: {
    backgroundColor: Colors.primary + "10",
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: Colors.primary,
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  ministrySection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
  },
  ministrySectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  ministrySectionTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  ministrySectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: 16,
  },
  noMinistriesText: {
    fontSize: 14,
    color: Colors.textTertiary,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: 16,
  },
  ministriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  ministryChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.borderLight,
    gap: 8,
  },
  ministryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  ministryChipText: {
    fontSize: 13,
    color: Colors.text,
  },
  checkIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: 20,
  },
  previewModal: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    width: "100%" as const,
    maxWidth: 360,
    padding: 20,
  },
  previewHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    marginBottom: 20,
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  previewImageContainer: {
    alignItems: "center" as const,
    marginBottom: 16,
  },
  previewImage: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 4,
    borderColor: Colors.primary + "30",
  },
  previewHint: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center" as const,
    marginBottom: 20,
  },
  previewActions: {
    flexDirection: "row" as const,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.textSecondary,
  },
  confirmButton: {
    flex: 1,
    flexDirection: "row" as const,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: 8,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: "#fff",
  },
});
