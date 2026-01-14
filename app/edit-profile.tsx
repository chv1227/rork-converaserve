import { useState } from "react";
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
} from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ArrowLeft, Camera, User, Phone, Mail } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { useAuth } from "@/providers/AuthProvider";
import { trpc } from "@/lib/trpc";

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

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: async (updatedUser) => {
      console.log("Profile updated successfully:", updatedUser.name);
      await updateUser({
        name: updatedUser.name,
        phone: updatedUser.phone,
        avatar: updatedUser.avatar,
      });
      
      if (Platform.OS === "web") {
        alert("Profile updated successfully!");
      } else {
        Alert.alert("Success", "Profile updated successfully!");
      }
      router.back();
    },
    onError: (error) => {
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
    });
  };

  const selectAvatar = (url: string) => {
    setAvatar(url);
    setShowAvatarPicker(false);
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
              onPress={() => setShowAvatarPicker(!showAvatarPicker)}
              activeOpacity={0.8}
            >
              <Image source={{ uri: avatar }} style={styles.avatar} contentFit="cover" />
              <View style={styles.cameraOverlay}>
                <Camera size={20} color="#fff" />
              </View>
            </TouchableOpacity>
            <Text style={styles.changePhotoText}>Tap to change photo</Text>
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
});
